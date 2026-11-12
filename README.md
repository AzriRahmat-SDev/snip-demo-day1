# Snip frontend

Angular 19 frontend for the Snip URL shortener. Run the backend on port 3000,
then run `npm install` and `npx ng serve`. Open `http://localhost:4200`.
The development server proxies `/api` to the backend; the production build
uses the same-origin API when served by the bundle.

Run `npx ng build` to generate `dist/snip-frontend/browser` and
`npx ng test --watch=false` to run the component tests.
