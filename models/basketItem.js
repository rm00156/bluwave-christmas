module.exports = function(sequelize, Sequelize) {
 
    var BasketItem = sequelize.define('basketItem', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        productItemFk:{
            type: Sequelize.INTEGER,
            allowNull : false
        },
        
        quantity:{
            type:Sequelize.INTEGER,
            allowNull:false
        },

        text1:{
            type:Sequelize.STRING,
            allowNull:true
        },

        accountFk:{
            type:Sequelize.INTEGER,
            allowNull:false
        },

        purchaseBasketFk:{
            type:Sequelize.INTEGER,
            allowNull:true
        } ,

        cost:{
            type:Sequelize.STRING,
            allowNull:false
        },

        path:{
            type:Sequelize.STRING,
            allowNull:false
        },
        fileName:{
            type:Sequelize.STRING,
            allowNull:false
        },

        displayItem1:
        {
            type:Sequelize.STRING,
            allowNull:true
        },
        displayItem2:
        {
            type:Sequelize.STRING,
            allowNull:true
        },
        displayItem3:
        {
            type:Sequelize.STRING,
            allowNull:true
        },

        picture:{
            type:Sequelize.STRING,
            allowNull:false
        },

        deleteFl:{
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        versionNo:{
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1
        }
        
    },{
        timestamps:false
    }
);
 
    return BasketItem;
 
}