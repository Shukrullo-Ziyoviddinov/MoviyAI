import { Schema, model, type InferSchemaType } from 'mongoose';

const adminAccountSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    photo: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'adminAccounts',
  }
);

export type AdminAccountDocument = InferSchemaType<typeof adminAccountSchema> & {
  _id: Schema.Types.ObjectId;
};

export const AdminAccount = model('AdminAccount', adminAccountSchema);
