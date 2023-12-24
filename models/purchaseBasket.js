function PurchaseBaskets(sequelize, Sequelize) {
  const PurchaseBasket = sequelize.define('purchaseBasket', {

    id: {
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER,
    },

    createdDttm: {
      type: Sequelize.DATE,
      allowNull: false,
    },

    purchaseDttm: {
      type: Sequelize.DATE,
      allowNull: true,
    },

    status: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    subTotal: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    total: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    orderNumber: {
      type: Sequelize.STRING,
      allowNull: true,
    },

    shippingAddressFk: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },

    shippedFl: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    },
    shippedDttm: {
      type: Sequelize.DATE,
      allowNull: true,
    },

    deliveryName: {
      type: Sequelize.STRING,
      allowNull: false,
    },

    deliveryPrice: {
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

  return PurchaseBasket;
}

module.exports = PurchaseBaskets;
