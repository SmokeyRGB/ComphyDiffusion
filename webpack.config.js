const path = require("path");

module.exports = {
    mode: "development",
    entry: "./src/index.js",
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "dist"),
        library: "Plugin",
        libraryTarget: "commonjs2"
    },
    devtool: false, // Disable eval() in UXP
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"]
                    }
                }
            }
        ]
    },
    resolve: {
        alias: {
            "upng-js": "upng-js/UPNG.js",
            "gsap": "gsap/dist/gsap.min.js"
        }
    }
};

