const fs = require('fs');
require('dotenv').config();
const { ApolloServer } = require('apollo-server-express');
const issue = require('./issue');
const auth = require('./auth.js')
const about = require('./about');
const GraphQLDate = require('./graphql_date');

function getContext({ req }) {
  const user = auth.getUser(req)
  return { user }
}

const resolvers = {
  Query: {
    about: about.getMessage,
    issueList: issue.list,
    issue: issue.get,
    issueCounts: issue.counts,
  },
  Mutation: {
    setAboutMessage: about.setMessage,
    issueAdd: issue.add,
    issueUpdate: issue.update,
    issueDelete: issue.delete,
    issueRestore: issue.restore,
  },
  GraphQLDate,
};

const server = new ApolloServer({
  typeDefs: fs.readFileSync('schema.graphql', 'utf-8'),
  resolvers,
  formatError: (error) => {
    console.log(error);
    return error;
  },
  context: getContext,
});

function installHandler(app) {
  const enableCors = (process.env.ENABLE_CORS || 'true') === 'true';
  console.log('CORS settings:', enableCors);
  server.applyMiddleware({ app, path: '/graphql', cors: enableCors });
}

module.exports = { installHandler };
