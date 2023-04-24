const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');

const GraphQLDate = new GraphQLScalarType({
  name: 'GraphQLDate',
  description: 'A Date() type in GraphQL as a scalar',
  serialize(value) {
    return value.toISOString(); // value sent to the client
  },
  parseValue(value) {
    // return new Date(value)
    const dateValue = new Date(value); // ? pourquoi ça devrait etre un nombre ?
    return Number.isNaN(dateValue.getTime()) ? undefined : dateValue;
  },
  parseLiteral(ast) {
    // return (ast.kind == Kind.STRING) ? new Date(ast.value) : undefined
    if (ast.kind === Kind.STRING) {
      const value = new Date(ast.value);
      // eslint-disable-next-line max-len
      return Number.isNaN(value.getTime()) ? undefined : value; // return undefined c'est traité comme une erreur par graphql
    }
    return undefined;
    // eslint-disable-next-line max-len
    // la fonction ne retourne rien, si parseLiteral ne retourne rien c'est comme un undefined et donc ça sera traité comme une erreur
  },
});


module.exports = GraphQLDate;
