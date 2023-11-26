module.exports = function(sequelize, Sequelize) {
 
    var Product = sequelize.define('product', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        
        productNumber: {
            type: Sequelize.STRING,
            allowNull: false
        },

        productTypeFk:{
            type: Sequelize.INTEGER,
            allowNull: false
        },
        name:{
            type: Sequelize.STRING,
            allowNull: false
        },

        description: {
            type: Sequelize.STRING,
            allowNull: false
        },
        
        displayImagePath:{
            type:Sequelize.STRING,
            allowNull:false  
        },

        saleFl:{
            type: Sequelize.BOOLEAN,
            allowNull: false,
        },

        saleAmount:{
            type: Sequelize.STRING,
            allowNull: true,
        },

        kidFl:{
            type: Sequelize.BOOLEAN,
            allowNull: false
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
 
    return Product;
 
}