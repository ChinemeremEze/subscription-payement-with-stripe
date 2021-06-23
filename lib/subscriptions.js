const plans = require('./plans.js');
const dotenv = require('dotenv').config();

class Subscriptions {
    constructor() {
        this.stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }

    async list() {
        return await this.stripe.subscriptions.list({ limit: 4 });
    }

    async get(subscription_id) {
        return await this.stripe.subscriptions.retrieve(subscription_id);
    }

    async create(customer_id, plan_name = "basic") {
        let plan = plans.items.find((element) => {
            return (element.name == plan_name) ? true : false;
        });

        return await this.stripe.subscriptions.create({
            customer: customer_id,
            items: [
              {price: plan.price_id},
            ],
        });
    }
} 

module.exports = Subscriptions;