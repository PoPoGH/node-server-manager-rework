# Node Server Manager Rework

A powerful and flexible server management tool for game servers.

## Features

- Server monitoring and management
- Player tracking and statistics
- Web interface for administration
- Command system with permissions
- Plugin system for extending functionality
- Account linking between web and game

## Token System

The system includes two different token commands:

1. **Regular Token Command** (`!token`)
   - For regular players to link their game accounts with web accounts
   - Can be used to generate or consume tokens

2. **Admin Setup Token** (`!st`)
   - Special one-time use token for admin account linking
   - Links the admin's game account with their web admin account
   - See [Admin Token System](docs/admin-token-system.md) for details

## Admin Setup

When first setting up the system:

1. Start the server once to create the initial admin account
2. Run `check-admin-token.bat` to see your admin setup token
3. Join the game and use the command `!st <your-token>` to link your admin account
4. Use the web interface for further configuration

## Documentation

- [Command System](docs/command-system.md)
- [Admin Token System](docs/admin-token-system.md)

## Scripts

### Maintenance Scripts

- `scripts/diagnostic/check-admin-token.bat` - Check the current admin token
- `scripts/diagnostic/setup-admin-token.bat` - Generate a new admin token
- `scripts/diagnostic/test-token-commands.bat` - Test the token commands

## Development

The project uses a plugin-based architecture that allows for easy extension of functionality.
Commands are now centralized in the command manager for better organization and extension.