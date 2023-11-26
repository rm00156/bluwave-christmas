module.exports = function(sequelize, Sequelize) {
 
    var Year = sequelize.define('year', {
 
        id: {
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
 
        year: {
            type: Sequelize.STRING,
            allowNull: false
        }
    },{
        timestamps:false
    });
 
    return Year;
 
}