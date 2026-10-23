import mongoose from "mongoose";

const { Schema } = mongoose;
const colorSchema = new Schema(
  { name: String, swatch: String },
  { _id: false },
);
const productSchema = new Schema(
  {
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    shape: String,
    material: String,
    gender: { type: String, enum: ["Men", "Women", "All"], required: true },
    price: { type: Number, required: true, min: 1 },
    salePrice: { type: Number, min: 1 },
    saleLabel: { type: Boolean, default: false },
    image: { type: String, required: true, trim: true },
    imageFileId: { type: String, default: "", trim: true, maxlength: 200 },
    imageEnhanced: { type: Boolean, default: false },
    tryOnImage: { type: String, default: "", trim: true, maxlength: 1000 },
    colors: [colorSchema],
    stock: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    measurements: { lens: Number, bridge: Number, temple: Number },
    description: String,
  },
  { timestamps: true },
);
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, default: undefined },
    googleId: { type: String, unique: true, sparse: true },
    avatarUrl: { type: String, default: "", trim: true, maxlength: 2048 },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    address: { type: String, default: "", trim: true, maxlength: 180 },
    city: { type: String, default: "", trim: true, maxlength: 80 },
    postalCode: { type: String, default: "", trim: true, maxlength: 20 },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
  },
  { timestamps: true },
);
userSchema.index(
  { role: 1 },
  { unique: true, partialFilterExpression: { role: "admin" } },
);
const sessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);
const orderItemSchema = new Schema(
  {
    productId: { type: String, required: true, trim: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    image: { type: String, default: "", maxlength: 2048 },
    color: { type: String, required: true, trim: true, maxlength: 40 },
    purpose: { type: String, default: "frame", trim: true, maxlength: 40 },
    coatings: { type: [String], default: [] },
    prescription: {
      right: { type: Number, min: -20, max: 20 },
      left: { type: Number, min: -20, max: 20 },
    },
    qty: { type: Number, required: true, min: 1, max: 10 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);
const orderSchema = new Schema(
  {
    orderNo: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    postalCode: { type: String, default: "", trim: true, maxlength: 20 },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain at least one item.",
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true, default: "Cash on delivery", trim: true, maxlength: 40 },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    user_action: {
      type: String,
      enum: ["pending", "confirmed", "canceled"],
      default: "pending",
      immutable: true,
    },
  },
  { timestamps: true },
);
const settingsSchema = new Schema(
  {
    _id: { type: String, default: "store" },
    storeName: { type: String, default: "Zoravelle" },
    announcement: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    phone: { type: String, default: "" },
    freeShippingThreshold: { type: Number, default: 150 },
    shopMaxPrice: { type: Number, default: 200, min: 40, max: 1000000 },
  },
  { timestamps: true, _id: false },
);

const newsletterSchema = new Schema(
  { email: { type: String, required: true, unique: true, lowercase: true } },
  { timestamps: true },
);

const productReviewSchema = new Schema(
  {
    productId: { type: String, required: true, trim: true, maxlength: 80 },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true, trim: true, maxlength: 80 },
    userImage: { type: String, default: "", trim: true, maxlength: 2048 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1200,
    },
  },
  { timestamps: true },
);
productReviewSchema.index({ productId: 1, createdAt: -1 });
productReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
const siteFeedbackSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: undefined },
    userImage: { type: String, default: "", trim: true, maxlength: 2048 },
    featured: { type: Boolean, default: false },
    featuredOrder: { type: Number, default: null },
  },
  { timestamps: true },
);
siteFeedbackSchema.index({ rating: -1, createdAt: -1 });
siteFeedbackSchema.index({ featured: 1, featuredOrder: 1 });

export const ProductReview =
  mongoose.models.ProductReview ||
  mongoose.model("ProductReview", productReviewSchema);
export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Session =
  mongoose.models.Session || mongoose.model("Session", sessionSchema);
export const Order =
  mongoose.models.Order || mongoose.model("Order", orderSchema);
export const StoreSettings =
  mongoose.models.StoreSettings ||
  mongoose.model("StoreSettings", settingsSchema);
export const Newsletter =
  mongoose.models.Newsletter || mongoose.model("Newsletter", newsletterSchema);
function refreshCachedModel(name, requiredPaths) {
  const cachedModel = mongoose.models[name];
  if (
    cachedModel &&
    requiredPaths.some((path) => !cachedModel.schema.path(path))
  ) {
    mongoose.deleteModel(name);
  }
}
refreshCachedModel("User", ["avatarUrl"]);
refreshCachedModel("ProductReview", ["userImage"]);
refreshCachedModel("SiteFeedback", ["featured", "featuredOrder", "userImage"]);
refreshCachedModel("Product", ["tryOnImage", "saleLabel"]);
refreshCachedModel("StoreSettings", ["shopMaxPrice"]);
export const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);
export const SiteFeedback =
  mongoose.models.SiteFeedback ||
  mongoose.model("SiteFeedback", siteFeedbackSchema);
