const mongoose = require('mongoose')


const TaskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
        // the white space both left and right of the title will be trimmed 
    },
    _listId:{
        type: mongoose.Types.ObjectId,
        required: true
        // will know which list this task belongs to
    },
    completed: {
        type: Boolean,
        default: false
    }
})

const Task = mongoose.model('Task', TaskSchema)

module.exports = { Task }