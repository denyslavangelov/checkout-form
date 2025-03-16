/**
 * Prepares checkout data from form values for submission to the Shopify API
 */
export function prepareCheckoutData(values: any, cartData: any) {
  // Extract base customer information
  const customerData = {
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone,
    // Note that the Storefront API requires an email but our form doesn't collect it
    // You might want to add this field to your form or use a default
    email: values.email || `${values.firstName.toLowerCase()}.${values.lastName.toLowerCase()}@example.com`,
    shippingMethod: values.shippingMethod,
    note: values.note || ''
  };

  // Add address information based on selected shipping method
  if (values.shippingMethod === 'address') {
    // Home delivery
    customerData.shipping_address = {
      first_name: values.firstName,
      last_name: values.lastName,
      address1: values.street ? `${values.street} ${values.number || ''}` : '',
      address2: values.building ? 
        `${values.building}${values.entrance ? `, вх. ${values.entrance}` : ''}${values.floor ? `, ет. ${values.floor}` : ''}${values.apartment ? `, ап. ${values.apartment}` : ''}` 
        : '',
      city: values.city,
      province: '', // Not used in Bulgaria
      zip: values.postalCode,
      country: 'Bulgaria',
      phone: values.phone,
      district: values.district || '',
    };
  } else {
    // Office delivery (Speedy or Econt)
    const courierName = values.shippingMethod === 'speedy' ? 'Speedy' : 'Econt';
    
    customerData.shipping_address = {
      first_name: values.firstName,
      last_name: values.lastName,
      address1: `${courierName} Office: ${values.officeAddress || ''}`,
      city: values.officeCity,
      province: '', // Not used in Bulgaria
      zip: values.officePostalCode,
      country: 'Bulgaria',
      phone: values.phone,
    };
  }

  return customerData;
}

/**
 * Alternative function that prepares the cart directly with lines
 * This is useful for creating the cart directly
 */
export function prepareCartData(formValues: any, cartData: any) {
  // Get customer information
  const customerInfo = prepareCheckoutData(formValues, cartData);
  
  // Format cart lines for Shopify
  const lines = cartData.items.map((item: any) => ({
    merchandiseId: item.variant_id || item.id,
    quantity: item.quantity
  }));
  
  return {
    customer: customerInfo,
    lines: lines
  };
} 