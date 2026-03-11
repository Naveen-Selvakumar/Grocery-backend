const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totalPrice: {
      type: Number,
      default: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Recalculate totals before saving
cartSchema.pre('save', function (next) {
  this.totalPrice = parseFloat(
    this.items.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2)
  );
  this.totalItems = this.items.reduce((acc, item) => acc + item.quantity, 0);
  next();
});

module.exports = mongoose.model('Cart', cartSchema);
