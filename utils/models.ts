import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  image: String,
  githubId: String,
}, { timestamps: true })

const PlacementSchema = new mongoose.Schema({
  x: Number,
  y: Number,
  color: String,
  userId: String, // or ObjectId if linking to User
}, { timestamps: true }) // adds createdAt and updatedAt

PlacementSchema.index({ x: 1, y: 1 }) // for latest per cell
PlacementSchema.index({ createdAt: -1 }) // for recent placements

export const User = mongoose.models.User || mongoose.model('User', UserSchema)
export const Placement = mongoose.models.Placement || mongoose.model('Placement', PlacementSchema)

// For daily grid snapshots
const DailyGridSchema = new mongoose.Schema({
  date: { type: Date, unique: true },
  grid: [[String]], // 2D array of colors, or perhaps a map, but array for simplicity
  width: Number,
  height: Number,
})

export const DailyGrid = mongoose.models.DailyGrid || mongoose.model('DailyGrid', DailyGridSchema)