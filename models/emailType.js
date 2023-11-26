module.exports = function(sequelize, Sequelize) {
 
    var EmailType = sequelize.define('emailType', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
 
        emailType: {
            type: Sequelize.STRING,
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
 
    return EmailType;
 
}