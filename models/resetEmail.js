module.exports = function(sequelize, Sequelize) {
 
    var ResetEmail = sequelize.define('resetEmail', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
 
        email: {
            type: Sequelize.STRING,
            allowNull:false,
            unique:true
        },

        fromDttm: {
            type: Sequelize.DATE,
            allowNull:false
        },

       
        toDttm: {
            type: Sequelize.DATE,
            allowNull:false
        },
        
        usedFl:{
            type: Sequelize.BOOLEAN,
            allowNull:false,
            default:false
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
 
    return ResetEmail;
 
}