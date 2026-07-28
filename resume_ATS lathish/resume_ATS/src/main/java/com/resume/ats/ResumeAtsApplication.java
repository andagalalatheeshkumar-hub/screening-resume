package com.resume.ats;

import com.resume.ats.model.Job;
import com.resume.ats.repository.JobRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class ResumeAtsApplication {

    public static void main(String[] args) {
        SpringApplication.run(ResumeAtsApplication.class, args);
    }

    @Bean
    public CommandLineRunner demoData(JobRepository jobRepository) {
        return args -> {
            if (jobRepository.count() == 0) {
                // Seed Job 1
                jobRepository.save(new Job(
                        "Senior Full-Stack Java Engineer",
                        "Engineering",
                        "Remote (USA / Canada)",
                        "We are seeking a talented Senior Full-Stack Java Engineer to join our growing engineering team. In this role, you will be responsible for designing, developing, and maintaining high-performance enterprise applications.",
                        "Core requirements:\n- Proficient in Java, Spring Boot, and Hibernate\n- Strong experience with frontend frameworks like React or Angular\n- Knowledge of relational databases (MySQL, PostgreSQL, Oracle)\n- Familiarity with CI/CD tools, Git, Docker, and AWS cloud platform\n- Understanding of Microservices architecture and REST APIs\n- Agile and Scrum experience"
                ));

                // Seed Job 2
                jobRepository.save(new Job(
                        "Frontend UI/UX Developer",
                        "Engineering",
                        "San Francisco, CA",
                        "Join our UI engineering team to build sleek, user-centric web applications. We care deeply about responsive web design, performance, and modern CSS layouts.",
                        "Core requirements:\n- HTML5, CSS3, Vanilla JavaScript, and TypeScript\n- Experience building production apps with React, Vite, and CSS frameworks (Tailwind, Bootstrap)\n- Proficiency in Figma for translating designs to code\n- Solid understanding of web performance and responsive design\n- Version control with Git and GitHub"
                ));

                // Seed Job 3
                jobRepository.save(new Job(
                        "Technical Project Manager",
                        "Product",
                        "Austin, TX (Hybrid)",
                        "We are looking for a Technical Project Manager to coordinate cross-functional engineering teams, manage product roadmaps, and ensure timely product deliveries.",
                        "Core requirements:\n- Strong project management skills\n- Expertise in Agile and Scrum methodologies\n- Experience with tools like Jira, GitLab, and Excel\n- Exceptional leadership and team communication skills\n- Technical background in software development is a plus"
                ));
            }
        };
    }
}
