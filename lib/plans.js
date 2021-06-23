var Plans = {
    items: [
        {
            name: "basic",
            label: "Basic",
            price: "100",
            product_id: "prod_ITSZZ4USXb2VEq",
            price_id: "price_1HsVeqFQksPvZrqnBOPB3ajy"
        },
        {
            name: "plus",
            label: "Plus",
            price: "200",
            product_id: "prod_ITSahxYPUF8Qid",
            price_id: "price_1HsVf4FQksPvZrqnMRXnd3GR"
        },
        {
            name: "advanced",
            label: "Advanced",
            price: "500",
            product_id: "prod_ITSao0nP7su2Un",
            price_id: "price_1HsVfIFQksPvZrqnefHxAfnA"
        }
    ],
    async get_plan_by_name(name) {
        let element_to_return;
        Plans.items.forEach(function(element) {
            if(name == element.name) {
                element_to_return = element;
            }
        });

        return element_to_return;
    },
    async get_plan_by_product_id(id) {
        let element_to_return;
        Plans.items.forEach(function(element) {
            if(id == element.product_id) {
                element_to_return = element;
            }
        });

        return element_to_return;
    }
}

module.exports = Plans;