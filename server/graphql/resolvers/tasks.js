const { AuthenticationError, UserInputError } = require('apollo-server')

const Task = require('../../models/Task')
const checkAuth = require('../../utils/checkAuth')

module.exports = {
  Query: {
    async getTasks(_, __, context) {
      const { username } = checkAuth(context)
      try {
        const tasks = await Task.find({
          $and: [{ isRoot: true }, { username: username }],
        }).sort({
          createdAt: -1,
        })
        return tasks
      } catch (error) {
        throw new Error(error)
      }
    },
    async getTask(_, { taskId }, context) {
      const { username } = checkAuth(context)
      try {
        const task = await Task.findById(taskId)
        const ids = []
        if (task.subTasks.length > 0) {
          task.subTasks.map((task) => {
            ids.push(task.subTaskId)
          })
        }
        const subTasks = await Task.find({
          $and: [{ _id: { $in: ids } }, { username }],
        })
        if (task) {
          return { task, subTasks }
        } else {
          throw new Error('Task not found')
        }
      } catch (error) {
        throw new Error(error)
      }
    },
    async getSubTasks(_, { subTaskIds }, context) {
      const { username } = checkAuth(context)
      try {
        const ids = []
        subTaskIds.map((task) => {
          ids.push(task.subTaskId)
        })
        const subTasks = await Task.find({
          $and: [{ _id: { $in: ids } }, { username }],
        })
        if (subTasks) {
          return subTasks
        } else {
          throw new Error('Task not found')
        }
      } catch (error) {
        throw new Error(error)
      }
    },
  },
  Mutation: {
    async createTask(_, { body }, context) {
      const user = checkAuth(context)
      // console.log(user);
      try {
        if (body.trim() === '') {
          throw new Error('Task body must not be empty')
        }
        const newTask = new Task({
          body,
          user: user.id,
          username: user.username,
          createdAt: new Date().toISOString(),
          isRoot: true,
          isDone: false,
          subTasks: [],
        })

        const task = await newTask.save()

        context.pubsub.publish('NEW_TASK', {
          newTask: task,
        })

        return task
      } catch (error) {
        throw new Error(error)
      }
    },
    createSubTask: async (_, { taskId, body }, context) => {
      const { username, id } = checkAuth(context)
      try {
        if (body.trim() === '') {
          throw new UserInputError('Empty comment', {
            errors: {
              body: 'Comment body must not be empty',
            },
          })
        }
        const newSubTask = new Task({
          body,
          user: id,
          username: username,
          createdAt: new Date().toISOString(),
          isRoot: false,
          isDone: false,
          subTasks: [],
        })
        const subTask = await newSubTask.save()
        context.pubsub.publish('NEW_TASK', {
          newTask: subTask,
        })
        const task = await Task.findById(taskId)

        if (task) {
          task.subTasks.unshift({
            subTaskId: subTask._id,
            subTaskTitle: subTask.body,
          })
          console.log({ task })
          await task.save()
          return task
        } else {
          throw new UserInputError('Post not founnd')
        }
      } catch (error) {
        throw new Error(error)
      }
    },
    async deleteTask(_, { taskId }, context) {
      const user = checkAuth(context)
      try {
        const task = await Task.findById(taskId)
        const deleteSubTask = (subTasksToDelete) => {
          if (subTasksToDelete.subTasks.length > 0) {
            subTasksToDelete.subTasks.forEach(async (subTask) => {
              const sub = await Task.findById(subTask.subTaskId)
              if (sub.subTasks.length > 0) {
                deleteSubTask(sub)
              }
              await (await Task.findById(subTask.subTaskId)).delete()
            })
          }
        }
        if (user.username === task.username) {
          deleteSubTask(task)
          await task.delete()
          return 'Task deleted Sucessfully'
        } else {
          throw new AuthenticationError('Action not allowed')
        }
      } catch (error) {
        throw new Error(error)
      }
    },
    async markDone(_, { taskId }, context) {
      checkAuth(context)
      const task = await Task.findById(taskId)
      if (task) {
        if (task.isDone) {
          // task already done, undo it
          task.isDone = false
        } else {
          // not done, mark done
          task.isDone = true
        }
        await task.save()
        return task
      } else {
        throw new UserInputError('Post not founnd')
      }
    },
    async editTask(_, { taskId, body }, context) {
      checkAuth(context)
      try {
        if (body.trim() === '') {
          throw new Error('Task body must not be empty')
        }
        const task = await Task.findById(taskId)
        if (task) {
          task.body = body
          await task.save()
          return task
        } else {
          throw new UserInputError('Post not founnd')
        }
      } catch (error) {
        throw new Error(error)
      }
    },
  },
  Subscription: {
    newTask: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator('NEW_TASK'),
    },
  },
}
