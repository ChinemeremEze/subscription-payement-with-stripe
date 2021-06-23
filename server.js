//  When set to true, will wipe your data. Use cautiously.
//StAuth10065: I Ezeakudolu Chinemerem David, 000778050 certify that this material is my original work. 
//No other person's work has been used without due acknowledgement. I have not made my work available to anyone else.
const start_clean = true;

const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv').config();
const mustache_express = require('mustache-express');
const moment = require('moment');
const app = express();
const socket = require('socket.io');

const twilio = require('twilio')(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN, {
  lazyLoading: true
});

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const http = require('http');
const server = http.Server(app);
const io = socket(server);

const Database = require('./lib/database.js');
const Customers = require('./lib/customers.js');
const Subscriptions = require('./lib/subscriptions.js');
const Plans = require('./lib/plans.js');

//  Init database for later
let database = new Database('./api.db');
(async () => {
  if(!start_clean) return;
  //  Wipe database
  database.wipe().then(async () => {
    let admin_user = await database.register_user("Administrator", "19055555555", "administrator", "admin", "admin@app.com", "1980-03-13");
    let customer_user = await database.register_user("Stig 6", "2899219808", "stig6", "six", "stigmus=[]@gmail.com", "2001-07-24");
    console.log('Admin user created', admin_user);
    console.log('Customer user created', customer_user);
  });
  //  Wipe Stripe customers
  stripe.customers.list({}).then(async (customers) => {
    customers.data.forEach((element) => {
      stripe.customers.del(element.id);
    });
    console.log('All customers removed from Stripe');
  });
}).call();

// registers the mustache engine with Express
app.engine("mustache", mustache_express());

// sets mustache to be the view engine
app.set('view engine', 'mustache');

// sets /views to be the /views folder
// files should have the extension filename.mustache
app.set('views', __dirname + '/views');

app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/views'));
app.use(express.json());

app.use(session({
  secret: 'johnny5isalive',
  resave: false,
  saveUninitialized: false
}));

//  Default data:
//  The default data we want to include in every page request
var default_data = {
  stripe_pk: process.env.STRIPE_PUBLIC_KEY,
  plans: Plans.items,
  has_active_plan: false,
  user: null,
}

//  Authentication middleware
app.use(async function (req, res, next) {
  console.log('Current page:', req.originalUrl);

  //  They went to /customer, but they aren't logged in
  if(req.originalUrl.indexOf('/customer/') >= 0 && !req.session.user) {
    res.redirect('/app');
    return;
  }
  //  They are logged in...
  else if(req.originalUrl.indexOf('/customer/') >= 0 && req.session.user) {
    //  If the user is logged in, keep a copy of the user's session
    default_data.user = req.session.user;
    //  If the user has a plan, let's add that to the list of data we pass in every page
    default_data.has_active_plan = req.session.user.stripe_subscription_id != null ? true : false;
    //  Do you have a subscription???
    //  Make sure they have a subscription id, that this is a GET request, and that they are not currently on the payment page
    if(!req.session.user.stripe_subscription_id && req.method == "GET" && req.originalUrl.indexOf('/customer/payment') == -1) {
      //  Make them do it.
      res.redirect('/customer/payment');
      return;
    }
  }
  //  They went to admin, but they aren't logged in / an actual administrator
  else if(req.originalUrl.indexOf('/admin/') >= 0) {
    if(!req.session.user) {
      res.redirect('/app');
      return;
    }

    //  Okay, so you're logged in - but are you an administrator?
    if(req.session.user.username != 'administrator') {
      res.redirect('/app');
      return;
    }
  }

  next();
});

app.get('/', async function(req, res) {
  res.redirect('/app');
  return;
});

app.get('/app', async function(req, res) {
  let data = { ...default_data };
  res.render('app/index', data);
});

app.post('/app/login', async function(req, res) {
  let data = { ...default_data };
  let user = await database.authenticate(req.body.username, req.body.password);

  if(!user) {
    data.login_error_message = "Username or password is invalid";
    
    res.render('app/index', data);
  } else {
    req.session.user = user;
    
    if(user.username == 'administrator') 
      res.redirect('/admin');
    else
      res.redirect('/customer');
    return;
  }
});

app.post('/app/register', async function(req, res) {
  let data = { ...default_data };

  if(req.body.password != req.body.password_verification){
    data.register_error_message = "Password and confirmation do not match";
    res.render('app/index', data);

  }
  else {
    let user = await database.register_user(req.body.name, req.body.phone, req.body.username, req.body.password, req.body.email, req.body.birthdate);

    if(!user) {
      data.register_error_message = "User could not be created";

      res.render('app/index', data);
    } else {
      req.session.user = user;

      let random_code = Math.floor(Math.random() * 999999) + 001;
      let number_to_send = req.session.user.phone;

      req.session.confirm_code = random_code;

      twilio.messages.create({
        from: process.env.PHONE_NUMBER,
        to: number_to_send,
        body: "Thank you for using Sealand Internet Services. Here is your authorization code: " + random_code
      })
      .then((message) => {
        console.log(message);
      })
      .done();
      
      res.redirect('/app/confirm');
    }
  }
});

app.get('/app/confirm', async function(req, res) {
  let data = { ...default_data };
  res.render('app/confirm', data);
})

app.post('/app/confirm', async function(req, res) {
  let data = { ...default_data };
  let code_entered = req.body.code;

  if(code_entered == req.session.confirm_code) {
    database.verified(req.session.user.id)
      .then(() => {
        res.redirect('/customer/payment');
      });
  } else {
    data.confirm_error_message = "The code entered is incorrect";

    res.render('app/confirm', data);
  }
})

app.get('/customer', async function(req, res) {
  let data = { ...default_data };
  res.render('customer/index', data);
});

app.get('/customer/profile', async function(req, res) {
  let data = { ...default_data };
  res.render('customer/profile', data);
});

//  You will need to complete this part!
//  User data updated via form submitted.
app.post('/customer/profile', async function(req, res) {
  let data = { ...default_data, };
  console.log(req.body.password);
  if(req.body.password != req.body.password_verification){
    data.update_error_message = "Password and confirmation do not match";
    res.render('customer/profile', data);
  }
  else {
    let updated_user = await database.update_profile(req.session.user.id,req.body.username, req.body.phone, req.body.birthdate, req.body.password);

    if(!updated_user) {
      data.update_error_message = "User could not be updated";
      res.render('customer/profile', data);
    } else {
      data.update_error_message  = "Profile has been Updated!"
      res.render('customer/profile', data);
    }
  }
});

app.get('/customer/downloads', async function(req, res) {
  let data = { ...default_data };
  res.render('customer/downloads', data);
});

app.get('/customer/payment', async function(req, res) {
  let data = { ...default_data };

  res.render('customer/payment', data);
});

//  Important: The lab requires that you be able to cancel a subscription. 
//  Make sure you don't miss that, or other key requirements!
app.post('/customer/index', async function(req, res) {
  let data = { ...default_data };
  let deleted_subscription = null;
  req.session.user.stripe_subscription_id = deleted_subscription;
  let updated_user = await database.set_stripe_subscription_id(req.session.user.id, deleted_subscription);

    if(!updated_user) {
      data.cancel_error_message = "Subscription could not be cancelled";
      res.render('customer/index', data);
    } else {
      data.cancel_error_message  = "Subcription cancelled!";
      console.log(data);
      data.has_active_plan = false;
      res.render('customer/index', data);
    }
});
app.post('/customer/payment', async function(req, res) {
  //  Find the Plan, retrieve the product id
  let plan = await Plans.get_plan_by_name(req.body.selected_plan);
  //  Should check to see if the customer already exists.
  //  If so, get the customer.id instead of creating a new one.
  if(req.session.user.stripe_customer_id  != null){
  
    database.set_stripe_customer_id(req.session.user.id, req.session.user.stripe_customer_id)
      .then(() => {
        stripe.subscriptions.create({
          customer: req.session.user.stripe_customer_id,
          items: [{
              plan: plan.price_id
          }]
        })
        .then(subscription => {
          // set stripe_subscription_id in database
          database.set_stripe_subscription_id(req.session.user.id, subscription.id)
            .then(() => {
              req.session.user.stripe_customer_id = req.session.user.stripe_customer_id;
              req.session.user.stripe_subscription_id = subscription.id;
              default_data.user = req.session.user;
              default_data.has_active_plan = true;
              res.redirect('/customer');
              return;
            })
            .catch(err => {
              console.log(err);
            })
        })
        .catch(err => {
          console.log(err);
        });
      });
  }
  else{
    let customer = stripe.customers.create({
      source: req.body.stripe_token,
      email: req.session.user.email,
      name: req.session.user.name,
      phone: req.session.user.phone,
    });

    customer.then(customer => {
      database.set_stripe_customer_id(req.session.user.id, customer.id)
        .then(() => {
          stripe.subscriptions.create({
            customer: customer.id,
            items: [{
                plan: plan.price_id
            }]
          })
          .then(subscription => {
            // set stripe_subscription_id in database
            database.set_stripe_subscription_id(req.session.user.id, subscription.id)
              .then(() => {
                req.session.user.stripe_customer_id = customer.id;
                req.session.user.stripe_subscription_id = subscription.id;
                default_data.user = req.session.user;
                default_data.has_active_plan = true;
                res.redirect('/customer');
                return;
              })
              .catch(err => {
                console.log(err);
              })
          })
          .catch(err => {
            console.log(err);
          });
        });
    });
  }
});

app.get('/customer/logout', async function(req, res) {
  delete req.session.user;
  default_data.user = null;
  default_data.has_active_plan = false;
  res.redirect('/app');
});

app.get('/admin', async function(req, res) {
  let customers = await stripe.customers.list({});
  let customer_list = customers.data;
  //  Get all customers
  await Promise.all(
    customer_list.map(async (element) => {
      //  Lookup the user in our database
      console.log(element.id);
      let user = await database.get_user_by_stripe_customer_id(element.id);
      if(user) {
        //  If the user exists, include their subscription info
        let subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
        let plan = await Plans.get_plan_by_product_id(subscription.plan.product);
        element.subscription_plan_name = plan.label;
        element.subscription_plan_price = subscription.plan.amount / 100;
        element.subscription_plan_price_id = subscription.plan.id;
        element.subscription_plan_start_date = subscription.start_date;
      }
    })
  );
  //  Note that we're now passing a reference to a function here:
  let data = { 
    ...default_data, 
    customers: customer_list, 
    format_date: format_date 
  };
  res.render('admin/index', data);
});

app.get('/admin/logout', async function(req, res) {
  delete req.session.user;
  default_data.user = null;
  default_data.has_active_plan = false;
  res.redirect('/app');
});

app.get(/^(.+)$/, function(req,res) {
    console.log("Static file request: " + req.params[0]);
    res.sendFile(__dirname + req.params[0]);
});

server.listen(3000, function() {
  console.log("Server started");
});

//  Utils
//  Format the date from unix epoch time to something readable
var format_date = function() {
  return function(val, render) {
      return moment.unix(render(val)).format('MMM DD, YYYY');
  }
}
