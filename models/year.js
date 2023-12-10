module.exports = function (sequelize, Sequelize) {
  const Year = sequelize.define('year', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    year: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    deleteFl: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    versionNo: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  }, {
    timestamps: false,
  });

  return Year;
};
