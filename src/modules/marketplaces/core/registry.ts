import type { MarketplaceConnector, MarketplaceType } from "./types";
import { UnsupportedOperationError } from "./errors";

class MarketplaceRegistry {
  private connectors: Map<MarketplaceType, MarketplaceConnector> = new Map();

  /**
   * Registers a connector adapter.
   */
  public register(connector: MarketplaceConnector): void {
    this.connectors.set(connector.name, connector);
  }

  /**
   * Resolves a registered connector by marketplace type.
   */
  public get(name: MarketplaceType): MarketplaceConnector {
    const connector = this.connectors.get(name);
    if (!connector) {
      throw new UnsupportedOperationError(
        `No connector registered for marketplace '${name}'.`,
        name
      );
    }
    return connector;
  }

  /**
   * Checks if a connector is registered and available.
   */
  public has(name: MarketplaceType): boolean {
    return this.connectors.has(name);
  }

  /**
   * Lists all registered connectors and their metadata.
   */
  public list(): Array<{ name: MarketplaceType; displayName: string }> {
    return Array.from(this.connectors.values()).map((c) => ({
      name: c.name,
      displayName: c.displayName,
    }));
  }
}

export const marketplaceRegistry = new MarketplaceRegistry();
