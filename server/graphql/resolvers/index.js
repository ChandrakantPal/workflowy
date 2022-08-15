const tasksResolvers = require('./tasks')
const usersResolvers = require('./users')

module.exports = {
  Query: {
    ...usersResolvers.Query,
    ...tasksResolvers.Query,
  },
  Mutation: {
    ...usersResolvers.Mutation,
    ...tasksResolvers.Mutation,
  },
  Subscription: {
    ...tasksResolvers.Subscription,
  },
}
