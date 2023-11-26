module.exports = function(sequelize, Sequelize) {
 
    var DeliveryOption = sequelize.define('deliveryOption', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.MEDIUMINT
        },
 
        option1: {
            type: Sequelize.STRING,
            allowNull:false
        },

        option1Price: {
            type: Sequelize.STRING,
            allowNull:false
        },
 
        option2: {
            type: Sequelize.STRING,
            allowNull:true
        },
        
        option2Price: {
            type: Sequelize.STRING,
            allowNull:true
        },
 
        option3: {
            type: Sequelize.STRING,
            allowNull:true
        },
        
        option3Price: {
            type: Sequelize.STRING,
            allowNull:true
        },

        option4: {
            type: Sequelize.STRING,
            allowNull:true
        },
        
        option4Price: {
            type: Sequelize.STRING,
            allowNull:true
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
    },
    {
        timestamps:false
    }
);
 
    return DeliveryOption;
 
}