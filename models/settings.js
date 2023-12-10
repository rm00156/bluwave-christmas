module.exports = function (sequelize, Sequelize) {
  const Setting = sequelize.define(
    'setting',
    {

      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.MEDIUMINT,
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      value: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      accountFk: {
        type: Sequelize.INTEGER,
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
    },
    {
      timestamps: false,
    },
  );

  return Setting;
};
