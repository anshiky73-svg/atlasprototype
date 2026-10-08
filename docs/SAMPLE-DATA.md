# Sample data policy

The application does not seed invented scholarships or present synthetic entries as verified records. Dashboard totals and scholarship rows are read from PostgreSQL. An empty database should display an empty state until configured sources are crawled successfully.

For a repeatable development demonstration, use a separate test database and an explicitly controlled official-source fixture or mocked crawler/extractor in tests. Do not lower verification requirements or label mock records as official.
