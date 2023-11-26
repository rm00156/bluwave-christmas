module.exports = function(sequelize, Sequelize) {
 
    var Template = sequelize.define('template', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.MEDIUMINT
        },
 
        name: {
            type: Sequelize.STRING,
            allowNull:false,
            unique: true
        },

        displayPath: {
            type: Sequelize.STRING,
            allowNull:false,
        },

        width:{
            type: Sequelize.STRING,
            allowNull: false
        },

        height:{
            type: Sequelize.STRING,
            allowNull: false
        },

        textCount:{
            type: Sequelize.INTEGER,
            allowNull: false
        },

        pictureCount:{
            type: Sequelize.INTEGER,
            allowNull: false
        },

        defaultPicture1Path:{
            type: Sequelize.STRING,
            allowNull: true
        },

        defaultPicture2Path:{
            type: Sequelize.STRING,
            allowNull: true
        },

        defaultPicture3Path:{
            type: Sequelize.STRING,
            allowNull: true
        },

        defaultPicture4Path:{
            type: Sequelize.STRING,
            allowNull: true
        },
        defaultPicture5Path:{
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
    },
    {
        timestamps:false
    }
);
 
    return Template;
 
}