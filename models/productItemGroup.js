function ProductItemGroups(sequelize, Sequelize) {
  const ProductItemGroup = sequelize.define(
    'productItemGroup',
    {

      id: {
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.MEDIUMINT,
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

  return ProductItemGroup;
}

module.exports = ProductItemGroups;
