/**
 * Public privacy policy page required for App Store listing.
 * Update contact email before submission.
 */
export default function PrivacyPolicy() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: "0 20px",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        lineHeight: 1.6,
        color: "#202223",
      }}
    >
      <h1>ShipMatch Privacy Policy</h1>
      <p>Last updated: October 4, 2026</p>

      <h2>Overview</h2>
      <p>
        ShipMatch (“the App”) is a Shopify Delivery Customization application.
        It helps merchants keep checkout shipping rates aligned with a delivery
        method the customer selected earlier on the storefront, by hiding rates
        that do not match a cart attribute. This policy explains what
        information the App processes.
      </p>

      <h2>Information we process</h2>
      <ul>
        <li>
          <strong>Store information:</strong> shop domain and app installation
          credentials required to operate the App.
        </li>
        <li>
          <strong>Checkout / cart data:</strong> cart attributes and delivery
          option titles are processed by Shopify Functions at checkout time to
          decide which shipping rates to hide. This processing runs on Shopify
          infrastructure.
        </li>
        <li>
          <strong>Configuration data:</strong> merchant-selected settings such
          as attribute key and match mode, stored as Shopify metafields.
        </li>
      </ul>

      <h2>How we use information</h2>
      <p>
        We use this information solely to provide the App’s shipping-rate
        filtering features, maintain the installation, and improve reliability.
        We do not sell personal data.
      </p>

      <h2>Data storage</h2>
      <p>
        Session data needed for authenticated admin access may be stored by the
        App’s hosting provider. Checkout function execution data is processed by
        Shopify and is subject to Shopify’s privacy terms.
      </p>

      <h2>Data retention & deletion</h2>
      <p>
        When you uninstall the App, we delete stored session records for your
        shop. Delivery customization configuration stored in Shopify may remain
        until removed in the Shopify admin.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions, contact{" "}
        <a href="mailto:support@example.com">support@example.com</a>.
      </p>
    </main>
  );
}
