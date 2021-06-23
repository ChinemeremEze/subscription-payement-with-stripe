const sqlite3 = require('sqlite3');

class Database {
    constructor(db_file) {
        this.db_file = db_file;
    }

    //  Provide access to the database for the class
    db() { 
        return new sqlite3.Database(this.db_file); 
    }

    //  Drops all tables and starts fresh
    wipe() {
        console.log('Dropping and re-creating tables');

        return new Promise((resolve, reject) => {
            this.db().serialize(() => {
                this.db()
                    .run('DROP TABLE IF EXISTS messages;')
                    .run('DROP TABLE IF EXISTS users;')
                    .run('CREATE TABLE IF NOT EXISTS messages (msgid INTEGER PRIMARY KEY, status TEXT NOT NULL, message TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP);')
                    .run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL, username TEXT NOT NULL, password TEXT NOT NULL, email TEXT NOT NULL, birthdate DATETIME NOT NULL, is_verified BOOLEAN DEFAULT false, stripe_customer_id TEXT, stripe_subscription_id TEXT);', (t, err) => {
                        resolve();
                    });
            });
        });
    }

    /*********************************************/
    //  Messages
    /*********************************************/

    //  Get all message from the database
    //  SELECT * FROM messages;
    async get_messages() { 
        let response_messages = [];
        return new Promise((resolve, reject) => {
            this.db().serialize(() => {
                this.db().each("SELECT * FROM messages;", (error, message) => {
                    if(!error) {
                        response_messages.push(message);
                    } else {
                        //  Provide feedback for the error
                        console.log(error);
                    }
                }, () => {
                    resolve(response_messages);
                });
            });
        });
    }

    //  Get a message from the database
    //  SELECT * FROM messages WHERE msgid = ?;
    async get_message(msgid) { 
        var return_value = false;
        return new Promise((resolve, reject) => {
            this.db().get("SELECT * FROM messages WHERE msgid = ?", [msgid], (error, row) => {
                if(!error) {
                    resolve(row);
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    resolve(false);
                }
            });
        });        
    }

    //  Add a message to the database
    //  INSERT INTO messages (status, message) VALUES (?, ?);
    async add_message(status, message) {
        var return_value = false;
        return new Promise((resolve, reject) => {
            this.db().run("INSERT INTO messages (status, message) VALUES (?, ?);", [status, message], async (error) => {
                if(!error) {
                    let last_message_id = await this.get_last_message_id();
                    if(last_message_id) {
                        let last_message = await this.get_message(last_message_id);
                        resolve(last_message);
                    } else {
                        resolve(false);
                    }
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    resolve(false);
                }
            });
        });        
    }

    //  Update a message in the database
    //  UPDATE messages SET status = ?, message = ? WHERE msgid = ?;
    async update_message(msgid, status, message) {
        var return_value = false;
        return new Promise((resolve, reject) => {
            console.log(msgid, status, message);
            this.db().run("UPDATE messages SET status = ?, message = ? WHERE msgid = ?", [status, message, msgid], (error) => {
                if(!error) {
                    resolve(true);
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    resolve(false);
                }
            });
        });
    }

    async get_last_message_id() {
        var return_value = false;
        return new Promise((resolve, reject) => {
            this.db().get("SELECT DISTINCT msgid FROM messages ORDER BY timestamp;", [], (error, row) => {
                if(!error) {
                    resolve(row.msgid);
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    resolve(false);
                }
            });
        });
    }

    //  Delete a message from the database
    //  DELETE FROM messages WHERE msgid = ?;
    async delete_message(msgid) {
        
    }

    //  Delete all messages from the database
    //  DELETE FROM messages;
    async delete_messages() {
        var return_value = false;
        return new Promise((resolve, reject) => {
            this.db().each("DELETE FROM messages;", (error, message) => {
                if(!error) {
                    return_value = true;
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    return_value = false;
                }
            }, () => {
                resolve(return_value);
            });
        });
    }

    /*********************************************/
    //  Users
    /*********************************************/
    
    //  Add user to database
    //  INSERT INTO users (name, phone, username, password, email, birthdate) VALUES (?, ?, ?, ?, ?, ?);
    async register_user(name, phone, username, password, email, birthdate) {
        return new Promise((resolve, reject) => {
            this.db().run("INSERT INTO users (name, phone, username, password, email, birthdate) VALUES (?, ?, ?, ?, ?, ?);", [name, phone, username, password, email, birthdate], async (error, user) => {
                if(!error) {
                    let user_id = await this.get_last_user_id();
                    if(user_id) {
                        let user = await this.get_user(user_id);
                        resolve(user);
                    } else {
                        resolve(false);
                    }
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    reject(error);
                }
            });
        });
    }

    //  Get last user id
    //  SELECT DISTINCT id FROM users ORDER BY id DESC;
    async get_last_user_id() {
        return new Promise((resolve, reject) => {
            this.db().get("SELECT DISTINCT id FROM users ORDER BY id DESC;", [], (error, user) => {
                if(!error) {
                    resolve(user.id);
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    resolve(false);
                }
            });
        });
    }

    //  Get a user from the database
    //  SELECT * FROM users WHERE id = ?;
    async get_user(id) { 
        return new Promise((resolve, reject) => {
            this.db().get("SELECT * FROM users WHERE id = ?", [id], (error, user) => {
                if(!error) {
                    resolve(user);
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    resolve(false);
                }
            });
        });        
    }

    //  Get a user from the database, based on stripe_customer_id
    //  SELECT * FROM users WHERE stripe_customer_id = ?;
    async get_user_by_stripe_customer_id(id) { 
        return new Promise((resolve, reject) => {
            this.db().get("SELECT * FROM users WHERE stripe_customer_id = ?", [id], (error, user) => {
                if(!error) {
                    resolve(user);
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    resolve(false);
                }
            });
        });        
    }

    //  Verify user
    //  SELECT * FROM users WHERE username = ? AND password = ?;
    async authenticate(username, password) {
        return new Promise((resolve, reject) => {
            this.db().get("SELECT * FROM users WHERE username = ? AND password = ?;", [username, password], async (error, user) => {
                if(!error) {
                    console.log('Authenticated user:', user);
                    resolve(user);
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    reject(error);
                }
            });
        });
    }

    //  Update a user in the database to show as a verified account
    //  UPDATE user SET is_verified = TRUE WHERE id = ?;
    async verified(id) {
        return new Promise((resolve, reject) => {
            this.db().run("UPDATE users SET is_verified = TRUE WHERE id = ?", [id], (error) => {
                if(!error) {
                    resolve(true);
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    resolve(false);
                }
            });
        });
    }

    //  Update a user in the database with their stripe_customer_id
    //  UPDATE users SET stripe_customer_id = ? WHERE id = ?;
    async set_stripe_customer_id(id, stripe_customer_id) {
        return new Promise((resolve, reject) => {
            this.db().run("UPDATE users SET stripe_customer_id = ? WHERE id = ?", [stripe_customer_id, id], (error) => {
                if(!error) {
                    resolve(true);
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    resolve(false);
                }
            });
        });
    }

    //  Update a user in the database with their stripe_subscription_id
    //  UPDATE users SET stripe_subscription_id = ? WHERE id = ?;
    async set_stripe_subscription_id(id, stripe_subscription_id) {
        return new Promise((resolve, reject) => {
            this.db().run("UPDATE users SET stripe_subscription_id = ? WHERE id = ?", [stripe_subscription_id, id], (error) => {
                if(!error) {
                    resolve(true);
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    resolve(false);
                }
            });
        });
    }

    //  Update a user's profile
    //  UPDATE users SET username = ?, phone = ?, birthdate = ?, password = ? WHERE id = ?;
    async update_profile(id, username, phone, birthdate, password) {
        return new Promise((resolve, reject) => {
            this.db().run("UPDATE users SET username = ?, phone = ?, birthdate = ?, password = ? WHERE id = ?", [username, phone, birthdate, password, id], (error) => {
                if(!error) {
                    resolve(true);
                } else {
                    //  Provide feedback for the error
                    console.log(error);
                    resolve(false);
                }
            });
        });
    }

} 

module.exports = Database;