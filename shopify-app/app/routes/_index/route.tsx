import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>ShipMatch</h1>
        <p className={styles.text}>
          A Shopify Delivery Customization app that keeps checkout shipping
          rates in sync with the delivery method customers already chose on
          your storefront — for example a pickup point or courier office
          selector.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>Hides unmatched shipping rates at checkout</li>
          <li>Driven by a cart attribute your storefront already sets</li>
          <li>Does not replace Shopify Checkout or process payments</li>
        </ul>
        <p className={styles.text}>
          Example: customer picks “Office Pickup” on your storefront → cart
          attribute is set → checkout shows only that rate, not “Home Delivery”.
        </p>
        <p className={styles.text}>
          <a href="/privacy">Privacy policy</a>
        </p>
      </div>
    </div>
  );
}
