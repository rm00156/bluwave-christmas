module.exports = function(sequelize, Sequelize) {
 
    var Class = sequelize.define('class', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },

        classNumber:{
            type: Sequelize.STRING,
            allowNull: false
        },
 
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },

        schoolFk: {
            type: Sequelize.INTEGER,
            allowNull: false
        },

        yearFk:{
            type: Sequelize.STRING,
            allowNull:false
        },

        proofPath:{
            type:Sequelize.STRING,
            allowNull:true
        },

        cardsPath:{
            type:Sequelize.STRING,
            allowNull:true
        },

        printFormPath:
        {
            type:Sequelize.STRING,
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
    });
 
    return Class;
 
}