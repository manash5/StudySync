
import express from "express"; 
import  type {Application, Request, Response} from "express";  
import dotenv from 'dotenv'; 
import cors from 'cors'; 
import connectDB from "./config/database";

dotenv.config();

connectDB(); 

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});