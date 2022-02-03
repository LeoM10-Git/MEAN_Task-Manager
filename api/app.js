const express = require('express')
const app = express();
const {mongoose} = require('./db/mongoose');
const cors = require('cors')
const jwt = require('jsonwebtoken')

//body parser package is deprecated. If you are using latest version of 
//express you don't have to install body-parser package. Body parser is now added to Express.
const bodyParser = require('body-parser');

// CORS HEADER MIDDLEWARE
// app.use(cors());
app.use( function(req, res, next) {

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");

    res.header(
        'Access-Control-Expose-Headers',
        'x-access-token, x-refresh-token'
    )
    next();   
})

// Load in the mongoose models
const {List, Task, User} = require('./db/models');

// check whether the request has a valid JWT token

let authenticate = (req, res, next) => {
    let token = req.header('x-access-token');
    // verify the JWT
    // @ts-ignore
    jwt.verify(token, User.getJwtSecret(), (err, decoded) => {
        if (err) {
            // there was an error
            // jwt is invalid do not authenticate
            res.status(401).send(err)
        }else{ 
            // jwt is valid
            req.user_id = decoded._id; // user_id is encoded in jwt secret, decoded from the jwt secret
            next();
        }
    })
}


// Load middleware 
app.use(bodyParser.json());

// verify refresh token middleware (which will be verifying the session)
// only apply to some request , so just define 
let verifySession = (req, res, next) => {
    //grab the refresh token from the request header
    let refreshToken = req.header('x-refresh-token');

    //grab the _id from the request header
    let _id = req.header('_id');

    // @ts-ignore
    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if (!user){
            // user not found 

            return Promise.reject({'error': 'user not found, make sure that refresh token and user id are correct'});
        }
        // user found 
        // therefore the session is valid
        req.user_id = user._id;
        req.refreshToken = refreshToken;
        req.userObject = user;

        let isSessionValid = false;

        user.sessions.forEach((session) => { 
            if (session.refreshToken === refreshToken) {
                // @ts-ignore
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid) {
            // the session is valid - call next() to continue with processing this web request
            next();
        }else{ 
            // this session is invalid
            return Promise.reject({
                'error': 'Refresh token has expired or the session is invalid'
            })
        }
    }).catch((error) => { 
        res.status(401).send(error) //status code 401, not authorized
    })
}
/* END MIDDLEWARE */

// route handle

/**
 * GET /lists
 * Purpose:Get all lists
 */
app.get('/lists', authenticate, (req, res) => {
    // We want to return an array of all the lists in the database, that belongs to the authenticated user
    List.find({
        // @ts-ignore
        _userId: req.user_id
    }).then(lists => {
        res.send(lists);
    })
})

/**
 * GET /list/:listId
 * Purpose:Get specifies list
 */

app.get('/lists/:id', authenticate, (req, res) => {
    // We want to return an array of all the lists in the database, that belongs to the authenticated user
    List.findOne({
        // @ts-ignore
        _userId: req.user_id,
        _id: req.params.id
    }).then(list  => {
        res.send(list);
    })
})

/**
 * POST /lists
 * Purpose:Create a list
 */
app.post('/lists', authenticate, (req, res) =>{
    //we want to create a new list and return the new list document back to the user ( which include the id)
    // The list information (fields will be passed in via the JSON request body)
    let title = req.body.title;

    let newList = new List({
        title,
        // @ts-ignore
        _userId: req.user_id
    });

    newList.save().then((listDoc => {
        // the full list document is returned (include id)
        res.send(listDoc);
    }))
})

/**
 * PATCH /lists/:id
 * Purpose: Update a specified list
 */
 app.patch('/lists/:id', authenticate, (req, res) =>{
    // We want to update the specified list (list document with id in the URL)
    // with the new values specified in the JSON body of request
    // @ts-ignore
    List.findOneAndUpdate({_id:req.params.id, _userId:req.user_id},
        {$set:req.body}).then(() => {
            res.send({'message': 'List is up'});
        })
})

/**
 * DELETE /lists/:id
 * Purpose: delete a specified list
 */
app.delete('/lists/:id',authenticate,  (req, res) => {
    // We want to delete the specified list
    List.findOneAndRemove({
        _id: req.params.id, 
        // @ts-ignore
        _userId: req.user_id}).then((removedListDoc) => {
        res.send(removedListDoc);
    // delete all the tasks that are in the deleted list
    deleteTasksFromList(removedListDoc._id)
    })
})

/** 
 * GET /lists/:listId/tasks
 * Purpose: Get all tasks for the specified list
*/
app.get('/lists/:listId/tasks', authenticate, (req, res) => {
    // we want to return all tasks that belongs to a specified list(specified by listId)
    // only the user can access own list, even other user get the list_id
    List.findOne({
        _id: req.params.listId,
        // @ts-ignore
        _userId: req.user_id})
        .then((list) => {
        if (list){
            // user object is valid
            // therefore the currently authenticated user can create a new task
            return true;
        } 
        return false;
        })
        .then((authenticated) => {
            if (authenticated){
                Task.find({_listId: req.params.listId})
                .then((tasks) => res.send(tasks))
            }else res.status(404).send("User is not authenticated")
        })
    })


app.get('/lists/:listId/tasks/:taskId',authenticate,  (req, res) => {
    List.findOne({
        _id: req.params.listId,
        // @ts-ignore
        _userId: req.user_id})
        .then((list) => {
        if (list){
            // user object is valid
            // therefore the currently authenticated user can create a new task
            return true;
        } 
        return false;
        })
        .then((authenticated) => {
            if (authenticated){
                Task.findOne(
                    {_listId: req.params.listId,
                    _id: req.params.taskId}).then((task) => res.send(task))
            }else res.status(404).send("User is not authenticated")
        })
    })

/** 
 * POST /lists/:listId/tasks
 * Purpose: Create a new task for the specified list
*/
app.post('/lists/:listId/tasks', authenticate,  (req, res) =>{
    //We want to create a new task for the specified list by specified listId

List.findOne({
    _id: req.params.listId,
    // @ts-ignore
    _userId: req.user_id})
    .then((list) => {
    if (list){
        // list object is with the specified condition was found
        // therefore the currently authenticated user can create a new task
        return true;
    } 
    return false;
    })
    .then((canCreateTask) => {
        if (canCreateTask){
            let newTask = new Task({
                title:req.body.title,
                _listId: req.params.listId,
            });
        newTask.save().then((newTaskDoc) => {
            res.send(newTaskDoc);
        })
        }else {
            res.status(404).send("User is not authenticated")
        }
    })
})

/** 
 * PATCH /lists/:listId/tasks/:taskId
 * Purpose: Update an existing task for the specified list
*/
app.patch('/lists/:listId/tasks/:taskId', authenticate, (req, res) =>{
    List.findOne({
        _id: req.params.listId,
        // @ts-ignore
        _userId: req.user_id})
        .then((list) =>{
           if (list){
                // list object is with the specified condition was found
                // therefore the currently authenticated user can update the specified task within this list
                return true;
           } 
           return false;
        }).then((canUpdate) =>{
            if (canUpdate){
                // current authenticated user can update the task
                Task.findOneAndUpdate({
                    _listId: req.params.listId,
                    _id: req.params.taskId},
                    {$set: req.body}).then(() => res.send({message: 'Task status updated'}));
            }else res.status(404).send("User not authenticated to update the task")
        })
})

/** 
 * DELETE /lists/:listId/tasks/:taskId
 * Purpose: Delete an existing task for the specified list
*/
app.delete('/lists/:listId/tasks/:taskId', authenticate, (req, res) =>{
    List.findOne({
        _id: req.params.listId,
        // @ts-ignore
        _userId: req.user_id})
        .then((list) =>{
           if (list){
                // list object is with the specified condition was found
                // therefore the currently authenticated user can update the specified task within this list
                return true;
           } 
           return false;
        }).then((canDelete) =>{
            if (canDelete){
                Task.findOneAndRemove({
                    _listId: req.params.listId,
                    _id: req.params.taskId}).then(() => res.status(200))
            }else res.status(404).send("User not authenticated to delete the task")
        })
    })
        
    

/* User routes */

/** 
 * POST /users
 * Purpose: Sign up
*/
app.post('/users', (req, res) => { 
    // User sign up
    let body = req.body;
    let newUser = new User(body);
    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        //Session created successfully - refreshToken returned
        // now generate an access auth token for the user
        return newUser.generateAccessAuthToken().then((accessToken) => {
            // access auth token generated successfully, now return an object containing the auth token
               return {accessToken, refreshToken}; 
        });
    }).then((authTokens) => {
        // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
        res.header('x-refresh-token', authTokens.refreshToken)
        .header('x-access-token', authTokens.accessToken)
        .send(newUser);
    }).catch((err) => {
        res.status(400).send(err)
    })
})

/** 
 * POST /users/login
 * Purpose: Login
*/
app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    // @ts-ignore
    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
        //Session created successfully - refreshToken returned
        // now generate an access auth token for the user
        return user.generateAccessAuthToken().then((accessToken) => {
            // access auth token generated successfully, now return an object containing the auth token
               return {accessToken, refreshToken}; 
        });
        }).then((authTokens) => {
            // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(user);
        })
    }).catch((err) => {
        res.status(400).send(err)
    })
})


/** 
 * GET /users/me/access-token
 * Purpose: generates and returns an access token
*/
app.get('/users/me/access-token', verifySession, (req, res) => {
    // user/caller is authenticated and have the user_id and user object available 
    // @ts-ignore
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({accessToken});
    }).catch((error) => {
        res.status(400).send({error})
    })

})

/* HELPER METHOD */
let deleteTasksFromList = (_listId) => {
    Task.deleteMany({_listId}).then(() => {
        console.log('Task deleted from list ' + _listId)
    });
}


app.listen(3000, () => {
    console.log("Server is listening on port 3000 ")
})

