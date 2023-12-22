module.exports = function (sequelize, Sequelize) {
  const ShippingAddress = sequelize.define(
    'shippingAddress',
    {

      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.MEDIUMINT,
      },

      fullName: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      addressLine1: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      addressLine2: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      city: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      postCode: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      countryFk: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },

      accountFk: {
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
    },
    {
      timestamps: false,
    },
  );

  return ShippingAddress;
};
