module.exports = function(sequelize, Sequelize) {
 
    var SchoolOrderInstruction = sequelize.define('schoolOrderInstruction', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
 
        schoolFk: {
            type: Sequelize.INTEGER,
            allowNull:false
        },

        pdfPath:{
            type:Sequelize.STRING,
            allowNull:false
        },

        createdDttm: {
            type:Sequelize.DATE,
            allowNull:false
        },

        versionNo: {
            type: Sequelize.INTEGER,
            allowNull: false
        },

        deleteFl: {
            type: Sequelize.BOOLEAN,
            allowNull: false
        }
        
    },{
        timestamps:false
    }
);
 
    return SchoolOrderInstruction;
 
}