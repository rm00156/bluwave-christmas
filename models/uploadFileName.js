module.exports = function (sequelize, Sequelize) {
  const UploadFileName = sequelize.define('uploadFileName', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

  }, {
    timestamps: false,
  });

  return UploadFileName;
};
