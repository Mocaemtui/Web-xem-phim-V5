import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
  movieSlug: string;
  movieName: string;
  username: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    movieSlug: { type: String, required: true, index: true },
    movieName: { type: String, required: true },
    username: { type: String, required: true },
    content: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);
