module.exports = function(sequelize, Sequelize) {
 
    var ProductVariant = sequelize.define('productVariant', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },

        orderNo: {
            type: Sequelize.INTEGER,
            allowNull: false
        },

        productFk:{
            type: Sequelize.INTEGER,
            allowNull: false
        },

        productVariantTypeFk:{
            type: Sequelize.STRING,
            allowNull: true
        },

        price: {
            type: Sequelize.STRING,
            allowNull: false
        },

        templateFk: {
            type: Sequelize.INTEGER,
            allowNull: false
        },

        defaultPdf:{
            type: Sequelize.STRING,
            allowNull: true
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
 
    return ProductVariant;
 
}