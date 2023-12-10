module.exports = function (sequelize, Sequelize) {
  const ProductType = sequelize.define(
    'productType',
    {

      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.MEDIUMINT,
      },

      type: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
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

  return ProductType;
};
