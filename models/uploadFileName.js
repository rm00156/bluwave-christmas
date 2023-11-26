module.exports = function(sequelize, Sequelize) {
 
    var UploadFileName = sequelize.define('uploadFileName', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
 
          
    },{
        timestamps:false
    });
 
    return UploadFileName;
 
}