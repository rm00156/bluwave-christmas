const STATUS_TYPES_ID =  {
    REGISTERED: 1,
    DEADLINE_SET: 2,
    ARTWORK_PACK_SENT: 3,
    PURCHASE_DEADLINE: 4,
    WAITING_FOR_CUSTOMER_RESPONSE: 5,
    DELAY: 6,
    PRINTING: 7,
    PACKING_COMPLETE: 8,
    OUT_FOR_DELIVERY: 9,
    WAITING_FOR_CHARITABLE_CONTRIBUTION_RESPONSE: 10,
    CONFIRMED_CHARITABLE_CONTRIBUTION: 11,
    CONTRIBUTION_SENT: 12,
    COMPLETE: 13
}

const STATUS_TYPES = {
    REGISTERED: 'Registered',
    DEADLINE_SET: 'Deadline Set',
    ARTWORK_PACK_SENT: 'Artwork Pack Sent to School',
    PURCHASE_DEADLINE: 'Purchase Deadline',
    WAITING_FOR_CUSTOMER_RESPONSE: 'Waiting for Customer Response',
    DELAY: 'Delay',
    PRINTING: 'Printing',
    PACKING_COMPLETE: 'Packing Complete',
    OUT_FOR_DELIVERY: 'Out For Delivery',
    WAITING_FOR_CHARITABLE_CONTRIBUTION_RESPONSE: 'Waiting for Charitable Contribution Response',
    CONFIRMED_CHARITABLE_CONTRIBUTION: 'Confirmed Charitable Contribution',
    CONTRIBUTION_SENT: 'Contribution Sent',
    COMPLETE: 'Complete'
}

module.exports = {
    STATUS_TYPES_ID,
    STATUS_TYPES
}
