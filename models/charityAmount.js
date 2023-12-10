module.exports = function (sequelize, Sequelize) {
  const CharityAmount = sequelize.define(
    'charityAmount',
    {

      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.MEDIUMINT,
      },

      schoolFk: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      amount: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      confirmedFl: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },

      createdDttm: {
        type: Sequelize.DATE,
        allowNull: false,
        default: Date.now(),
      },

      confirmedDttm: {
        type: Sequelize.DATE,
        allowNull: true,
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

  return CharityAmount;
};
