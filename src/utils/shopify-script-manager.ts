export async function installCheckoutScript(shop: string, accessToken: string) {
  try {
    // First, check if the script is already installed
    const listResponse = await fetch(
      `/api/shopify/script-tags?shop=${encodeURIComponent(shop)}&accessToken=${encodeURIComponent(accessToken)}`
    );
    
    if (!listResponse.ok) {
      throw new Error('Failed to list existing script tags');
    }
    
    const { script_tags } = await listResponse.json();
    const existingScript = script_tags.find(
      (script: any) => script.src.includes('shopify-integration.js')
    );
    
    // If script already exists, no need to install it again
    if (existingScript) {
      console.log('Checkout script is already installed');
      return { success: true, scriptTagId: existingScript.id };
    }
    
    // Install the script
    const installResponse = await fetch('/api/shopify/script-tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shop,
        accessToken
      })
    });
    
    if (!installResponse.ok) {
      throw new Error('Failed to install script tag');
    }
    
    const { script_tag } = await installResponse.json();
    console.log('Checkout script installed successfully');
    
    return { success: true, scriptTagId: script_tag.id };
  } catch (error) {
    console.error('Error installing checkout script:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function uninstallCheckoutScript(shop: string, accessToken: string, scriptTagId: string) {
  try {
    const response = await fetch(
      `/api/shopify/script-tags?shop=${encodeURIComponent(shop)}&accessToken=${encodeURIComponent(accessToken)}&scriptTagId=${encodeURIComponent(scriptTagId)}`,
      {
        method: 'DELETE'
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to uninstall script tag');
    }
    
    console.log('Checkout script uninstalled successfully');
    return { success: true };
  } catch (error) {
    console.error('Error uninstalling checkout script:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
} 