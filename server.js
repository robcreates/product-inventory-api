const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const DATA_FILE = path.join(__dirname, "products.json");

function readProducts() {
  const data = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(data);
}

function writeProducts(products) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
}

function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer((req, res) => {
  const { method, url } = req;

  if (method === "GET" && url === "/products") {
    const products = readProducts();
    sendResponse(res, 200, products);
    return;
  }

  if (method === "GET" && url.match(/^\/products\/\d+$/)) {
    const id = parseInt(url.split("/")[2]);
    const products = readProducts();
    const product = products.find((p) => p.id === id);

    if (product) {
      sendResponse(res, 200, product);
    } else {
      sendResponse(res, 404, { message: "Product not found" });
    }
    return;
  }

  if (method === "POST" && url === "/products") {
    getRequestBody(req)
      .then((newProduct) => {
        const products = readProducts();
        const id = products.length > 0 ? products[products.length - 1].id + 1 : 1;
        const product = { id, ...newProduct };
        products.push(product);
        writeProducts(products);
        sendResponse(res, 201, product);
      })
      .catch(() => {
        sendResponse(res, 400, { message: "Invalid JSON body" });
      });
    return;
  }

  if (method === "PUT" && url.match(/^\/products\/\d+$/)) {
    const id = parseInt(url.split("/")[2]);
    getRequestBody(req)
      .then((updatedData) => {
        const products = readProducts();
        const index = products.findIndex((p) => p.id === id);

        if (index === -1) {
          sendResponse(res, 404, { message: "Product not found" });
        } else {
          products[index] = { id, ...updatedData };
          writeProducts(products);
          sendResponse(res, 200, products[index]);
        }
      })
      .catch(() => {
        sendResponse(res, 400, { message: "Invalid JSON body" });
      });
    return;
  }

  if (method === "DELETE" && url.match(/^\/products\/\d+$/)) {
    const id = parseInt(url.split("/")[2]);
    const products = readProducts();
    const index = products.findIndex((p) => p.id === id);

    if (index === -1) {
      sendResponse(res, 404, { message: "Product not found" });
    } else {
      const deleted = products.splice(index, 1);
      writeProducts(products);
      sendResponse(res, 200, { message: "Product deleted", product: deleted[0] });
    }
    return;
  }

  sendResponse(res, 404, { message: "Route not found" });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});