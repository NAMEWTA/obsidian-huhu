import type { HealthScanner, HealthRepairs, HealthReport } from '../api';
export interface HealthPagePort {
	readonly scanner: HealthScanner;
	readonly repairs: HealthRepairs;
	getReport(id?: string): HealthReport | undefined;
	openNotifications(): void;
}
export interface HealthPageProps {
	port: HealthPagePort;
	section?: 'scan' | 'repair';
	reportId?: string;
	navigate: (section: 'scan' | 'repair', reportId?: string) => void;
}
