import dotenv from "dotenv";
import path from "path";
import webpack from "webpack";

dotenv.config();

const mode = process.env.NODE_ENV === "production" ? "production" : "development";

const config: webpack.Configuration = {
    mode,
    entry: {
        main: path.join(process.cwd(), "src", "client", "index.ts")
    },
    output: {
        path: path.join(process.cwd(), "public", "js"),
        filename: "[name].js"
    },
    module: {
        rules: [{
            test: /\.ts$/, use: "ts-loader", exclude: /node_modules/
        }]
    }
};

export default config;