const { UserInputError } = require('apollo-server-express');
const { getDb, getNextSequence } = require('./db');
const { mustBeSignedIn } = require('./auth.js');

function validate(issue) {
  const errors = [];
  if (issue.title.length < 3) {
    errors.push('Field "title" must be at least 3 characters Long.');
  }
  if (issue.status === 'Assigned' && !issue.owner) {
    errors.push('Field "owner" is required when status is "Assigned"');
  }
  if (errors.length > 0) {
    throw new UserInputError('Invalid input(s)', { errors });
  }
}

const PAGE_SIZE = 10;

async function list(_, {
  status, effortMin, effortMax, search, page,
}) {
  const db = getDb();
  const filter = {};
  if (status) filter.status = status;
  if (effortMin !== undefined || effortMax !== undefined) {
    filter.effort = {};
    if (effortMin !== undefined) filter.effort.$gte = effortMin;
    if (effortMax !== undefined) filter.effort.$lte = effortMax;
  }
  if (search) filter.$text = { $search: search };
  const cursor = db.collection('issues').find(filter)
    .sort({ id: 1 })
    .skip(PAGE_SIZE * (page - 1))
    .limit(PAGE_SIZE);

  const totalCount = await cursor.count(false);
  const issues = cursor.toArray();
  const pages = Math.ceil(totalCount / PAGE_SIZE);
  return { issues, pages };
}

async function get(_, { id }) {
  const db = getDb();
  const issue = await db.collection('issues').findOne({ id });
  return issue;
}

async function add(_, { issue }) {
  const db = getDb();
  validate(issue);

  const newIssue = Object.assign({}, issue);
  newIssue.created = new Date();
  newIssue.id = await getNextSequence('issues');

  const result = await db.collection('issues').insertOne(newIssue);
  const savedIssue = await db.collection('issues').findOne({ _id: result.insertedId });
  return savedIssue;
}

async function update(_, { id, changes }) {
  const db = getDb();
  if (changes.title || changes.status || changes.owner) {
    const issue = await db.collection('issues').findOne({ id });
    Object.assign(issue, changes);
    validate(issue);
  }
  await db.collection('issues').updateOne({ id }, { $set: changes });
  const savedIssue = await db.collection('issues').findOne({ id });
  return savedIssue;
}

async function remove(_, { id }) {
  const db = getDb();
  const issue = await db.collection('issues').findOne({ id });
  if (!issue) return false;
  issue.deleted = new Date();

  let result = await db.collection('deleted_issues').insertOne(issue);
  if (result.insertedId) {
    result = await db.collection('issues').deleteOne({ id });
    return result.deletedCount === 1;
  }
  return false;
}

async function restore(_, { id }) {
  const db = getDb();
  const issue = await db.collection('deleted_issues').findOne({ id });
  if (!issue) return false;
  issue.deleted = new Date();

  let result = await db.collection('issues').insertOne(issue);
  if (result.insertedId) {
    result = await db.collection('deleted_issues').removeOne({ id });
    return result.deletedCount === 1;
  }
  return false;
}

async function counts(_, { status, effortMin, effortMax }) {
  const db = getDb();
  const filter = {};
  if (status) filter.status = status;
  if (effortMin !== undefined || effortMax !== undefined) {
    filter.effort = {};
    if (effortMin !== undefined) filter.effort.$gte = effortMin;
    if (effortMax !== undefined) filter.effort.$lte = effortMax;
  }

  const results = await db.collection('issues').aggregate([
    {
      $match: filter,
    },
    {
      $group: {
        _id: { owner: '$owner', status: '$status' }, // Fait des sous-groupes en regroupant chaque duo owner/status
        count: { $sum: 1 }, // puis compte le nombre d'éléments de chaque sous-groupe
      },
    },
  ]).toArray(); // Ex: [ { "_id" : { "owner" : "Ravan", "status" : "New" }, "count" : 11 }, {...} ]

  const statusCounts = {};
  results.forEach((elem) => {
    const { _id: { owner, status: statusElem }, count } = elem;
    if (!statusCounts[owner]) statusCounts[owner] = { owner };
    statusCounts[owner][statusElem] = count;
  });
  return Object.values(statusCounts); // [{ "owner": "Eddie", "New": 11, "Assigned": 6 }, {...}]
}

module.exports = {
  list,
  add: mustBeSignedIn(add),
  get,
  update: mustBeSignedIn(update),
  delete: mustBeSignedIn(remove),
  restore: mustBeSignedIn(restore),
  counts,
};
