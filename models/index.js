var fs = require("fs");
var path = require("path");
var Sequelize = require("sequelize");
var env = process.env.NODE_ENV || "development";

var sequelize = new Sequelize(env == "test" ? process.env.test_database : process.env.database, process.env.username, process.env.password, {
    host: process.env.database_host,
    dialect: process.env.database_dialect,
    port: process.env.database_port,
    logging: env != 'test',
    pool: {
        max: 12,
        min: 0,
        idle: 10000,
      },
});
var db = {};

fs
    .readdirSync(__dirname)
    .filter(function(file) {
        return (file.indexOf(".") !== 0) && (file !== "index.js");
    })
    .forEach(function(file) {
        var model = model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
    });
 
Object.keys(db).forEach(function(modelName) {
    if ("associate" in db[modelName]) {
        db[modelName].associate(db);
    }
});
 
 
db.sequelize = sequelize;
db.Sequelize = Sequelize;
 
module.exports = db;