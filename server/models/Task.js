const { model, Schema } = require('mongoose')

const taskSchema = new Schema({
  body: String,
  username: String,
  createdAt: String,
  isRoot: Boolean,
  isDone: Boolean,
  subTasks: [
    {
      subTaskId: {
        type: Schema.Types.ObjectId,
        ref: 'tasks',
      },
      subTaskTitle: String,
    },
  ],
  user: {
    type: Schema.Types.ObjectId,
    ref: 'users',
  },
})

module.exports = model('Task', taskSchema)
