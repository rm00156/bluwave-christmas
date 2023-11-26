module.exports = function(sequelize, Sequelize) {
 
    var ProductItem = sequelize.define('productItem', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        productItemNumber: {
            type: Sequelize.STRING,
            allowNull: false
        },
        
        productVariantFk:{
            type: Sequelize.INTEGER,
            allowNull: false
        },

        productItemGroupFk: {
            type: Sequelize.INTEGER,
            allowNull: false
        },

        picture1Path:{
            type: Sequelize.STRING,
            allowNull: true
        },

        picture2Path:{
            type:Sequelize.STRING,
            allowNull:true
        },

        picture3Path:{
            type:Sequelize.STRING,
            allowNull:true
        },

        picture4Path:{
            type:Sequelize.STRING,
            allowNull:true
        },

        picture5Path:{
            type:Sequelize.STRING,
            allowNull:true
        },

        pdfPath: {
            type: Sequelize.STRING,
            allowNull: false
        },

        samplePath: {
            type: Sequelize.STRING,
            allowNull: true
        },

        accountFk:{
            type:Sequelize.INTEGER,
            allowNull:false
        },

        displayItem1:{
            type:Sequelize.BOOLEAN,
            allowNull:false
        },

        displayItem2:{
            type:Sequelize.BOOLEAN,
            allowNull:false
        },

        displayItem3:{
            type:Sequelize.BOOLEAN,
            allowNull:false
        },

        classFk: {
            type:Sequelize.INTEGER,
            allowNull: true
        },

        text1: {
            type: Sequelize.STRING,
            allowNull: true
        },

        text2: {
            type: Sequelize.STRING,
            allowNull: true
        },

        text3: {
            type: Sequelize.STRING,
            allowNull: true
        },

        text4: {
            type: Sequelize.STRING,
            allowNull: true
        },

        text5: {
            type: Sequelize.STRING,
            allowNull: true
        },
        
        kidFk:{
            type: Sequelize.INTEGER,
            allowNull: true
        },

        deleteFl: {
            type: Sequelize.BOOLEAN,
            allowNull: false
        },

        versionNo: {
            type: Sequelize.INTEGER,
            allowNull: false
        }
        
        
    },{
        timestamps:false
    }
);
 
    return ProductItem;
 
}