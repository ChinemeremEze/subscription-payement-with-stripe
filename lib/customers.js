const plans = require('./plans.js');
const dotenv = require('dotenv').config();

class Customers {
    constructor() {
        this.stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }

    async list() {
        return await this.stripe.customers.list({ limit: 4 });
    }

    async get(customer_id) {
        return await this.stripe.customers.retrieve(customer_id);
    }

    async create(full_name, email_address) {
        return await this.stripe.customers.create({
            name: full_name,
            email: email_address,
            description: "Added by Lab 5 Starter Kit",
        });
    }

    async add_payment_source(customer_id, email_address) {
        return this.stripe.sources.create({
            type: 'ach_credit_transfer',
            currency: 'usd',
            owner: {
              email: email_address
            }
          }, function(err, source) {
            console.log(err);
          });
    }
} 

module.exports = Customers;