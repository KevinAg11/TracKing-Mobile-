import { registerRootComponent } from 'expo';

// Background location task must be defined before the React tree mounts.
// This import registers the task with expo-task-manager at module load time.
import './src/features/tracking/tasks/backgroundLocationTask';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
